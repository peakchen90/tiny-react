let nextUnitOfWork = null;
let currentRoot = null;
let deletions = null
let wipRoot = null;

let wipFiber = null;
let hookIndex = null;

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => {
        if ({}.toString.call(child) === '[object Object]') {
          return child;
        }
        return createTextElement(child)
      })
    }
  }
}

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

/**
 * 创建dom
 * @param fiber
 * @return {Text|*}
 */
function createDom(fiber) {
  const dom = fiber.type === 'TEXT_ELEMENT'
    ? document.createTextNode('')
    : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom;
}

function isEventProp(prop) {
  return /^on[A-Z][\w$]*$/.test(prop)
}

function getEventType(prop) {
  return prop.slice(2, 3).toLowerCase() + prop.slice(3)
}

/**
 * 更新dom
 * @param dom
 * @param prevProps
 * @param nextProps
 */
function updateDom(dom, prevProps, nextProps) {
  Object.keys(prevProps).forEach(prop => {
    if (prop === 'children') {
      return
    }
    if (isEventProp(prop) && (!(prop in nextProps) || prevProps[prop] !== nextProps[prop])) { // remove event
      const eventType = getEventType(prop)
      dom.removeEventListener(eventType, prevProps[prop])
    }
    if (!(prop in nextProps)) { // remove property
      dom.removeAttribute(prop)
    } else if (prevProps[prop] !== nextProps[prop]) { // update property
      dom[prop] = nextProps[prop]
    }
  })

  Object.keys(nextProps).forEach(prop => {
    if (prop === 'children') {
      return
    }
    if (prevProps[prop] !== nextProps[prop]) { // update property
      if (isEventProp(prop)) { // add event
        const eventType = getEventType(prop)
        dom.addEventListener(eventType, nextProps[prop])
      } else {
        dom[prop] = nextProps[prop]
      }
    }
  })
}

/**
 * commit根节点(同步执行，不能打断)，执行完成清空wip标志，并记录当前已更新的fiber根节点 currentRoot
 */
function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot;
  wipRoot = null;
}

/**
 * commit阶段，更新dom，还是按照 fiber -> 第一个子节点 -> 子节点的右侧兄弟节点 顺序深度优先遍历
 * @param fiber
 */
function commitWork(fiber) {
  if (!fiber) {
    return
  }

  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent)
  }

  // 递归遍历子节点或兄弟节点
  commitWork(fiber.child)
  commitWork(fiber.sibling)

  // 应用 effect hooks
  if (fiber.hooks) {
    const oldHooks = (fiber.alternate && fiber.alternate.hooks) || []
    fiber.hooks.forEach((item, index) => {
      if (item.type !== 'effect') return;
      if (!fiber.alternate) { // 初次渲染，直接执行effect回调
        item.callback()
      } else { // 更新时，控制执行effect回调
        const oldDeps = (oldHooks[index] && oldHooks[index].deps) || [];
        if (!item.deps || item.deps.some((dep, i) => dep !== oldDeps[i])) {
          item.callback()
        }
      }
    })
  } else if (fiber.componentInstance) {
    if (!fiber.alternate) {
      if (fiber.componentInstance.componentDidMount) {
        fiber.componentInstance.componentDidMount()
      }
    } else {
      if (fiber.componentInstance.componentDidUpdate) {
        fiber.componentInstance.componentDidUpdate(
          fiber.alternate.componentInstance.props,
          fiber.alternate.componentInstance.state
        )
      }
    }
  }
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom != null) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

function Component(props) {
  this.props = props || {}
}

Component.prototype.setState = function (state) {
  this.state = Object.assign(this.state || {}, state)
  wipRoot = {
    dom: currentRoot.dom,
    props: currentRoot.props,
    alternate: currentRoot
  }
  nextUnitOfWork = wipRoot;
  deletions = []
  requestIdleCallback(workLoop)
}

/**
 * 更新 class 组件
 * @param fiber
 */
function updateClassComponent(fiber) {
  wipFiber = fiber;
  wipFiber.componentInstance = wipFiber.componentInstance || new fiber.type(fiber.props)
  const children = [
    wipFiber.componentInstance.render()
  ]
  reconcileChildren(fiber, children)
}


/**
 * 更新 FC 组件
 * @param fiber
 */
function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0; // 每次更新FC，会重置 hookIndex，并清空 hooks
  wipFiber.hooks = [];
  const children = [
    fiber.type(fiber.props) // 渲染FC组件，作为 children
  ]
  reconcileChildren(fiber, children)
}

/**
 * 更新原生 HOST 组件
 * @param fiber
 */
function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

/**
 * 调和子节点
 * @param wipFiber
 * @param children
 */
function reconcileChildren(wipFiber, children) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null;

  while (index < children.length || oldFiber != null) {
    const element = children[index]
    let newFiber = null;
    const sameType = oldFiber && element && element.type === oldFiber.type;
    if (sameType) { // 与 oldFiber 类型相同，直接复用 oldFiber 的dom节点，并标记"UPDATE"，以便于在 commit 阶段更新dom
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        componentInstance: oldFiber.componentInstance,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE'
      }
    } else {
      if (element) {
        newFiber = {
          type: element.type,
          props: element.props,
          dom: null,
          parent: wipFiber,
          alternate: oldFiber,
          effectTag: 'PLACEMENT'
        }
      }
      if (oldFiber) {
        oldFiber.effectTag = 'DELETION';
        deletions.push(oldFiber);
      }
    }

    // 更新 oldFiber 指向的位置，与正在遍历的新的 fiber 节点对应
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    if (index === 0) {
      wipFiber.child = newFiber // 将第一个子节点绑定到 fiber.child
    } else {
      prevSibling.sibling = newFiber // 将第二个及后面的接口，依次绑定到前一个的 fiber.sibling 上，上一个就可以通过 fiber.sibling 访问下一个节点
    }

    prevSibling = newFiber // 保存上一个新节点的引用
    index++
  }
}

/**
 * 执行单元任务，并返回下一个待执行的任务
 * @param fiber
 * @return {null|*}
 */
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    let current = fiber.type.prototype;
    while (current != null && !(current instanceof Component)) {
      current = current.prototype;
    }
    if (current) {
      updateClassComponent(fiber)
    } else {
      updateFunctionComponent(fiber)
    }
  } else {
    updateHostComponent(fiber)
  }

  // 1. 深度优先遍历，优先遍历 fiber.child
  // 2. 如果找不到 fiber.child，则查找右侧兄弟节点，如果兄弟节点找不到，则递归往上查找父节点的兄弟节点
  // 3. 遍历到父节点的兄弟节点后，如果该节点有 fiber.child，则还是会继续遍历 fiber.child, 重复第 1 步
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

function workLoop(deadline) {
  // console.log('workLoop:', Date.now())
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) { // 没有进行中的调和任务，且没有commit过时，批量commit更新（同步操作，不可打断）
    commitRoot()
  }
  if (nextUnitOfWork || wipRoot) {
    requestIdleCallback(workLoop)
  }
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  }
  deletions = [];
  nextUnitOfWork = wipRoot;
  requestIdleCallback(workLoop)
}

function useState(initial) {
  // 获取当前指针指向的 hook 信息，初次渲染为 undefined
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [] // 可能会多次执行 setState，保存以便于更新每次执行结果
  }

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    if (typeof action === 'function') {
      hook.state = action(hook.state)
    } else {
      hook.state = action;
    }
  })

  const setState = action => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot
    }
    nextUnitOfWork = wipRoot; // 修改全局变量 nextUnitOfWork 触发更新，有一个全局不断递归的 workLoop 方法会检查（正式版 react 是这样触发更新？）
    deletions = []
    requestIdleCallback(workLoop)
  }

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState]
}

function useEffect(callback, deps) {
  // 获取当前指针指向的 hook 信息，初次渲染为 undefined
  // const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex]
  const hook = {
    type: 'effect',
    callback,
    deps
  }

  wipFiber.hooks.push(hook);
  hookIndex++;
}

const TinyReact = {
  createElement,
  render,
  useState,
  useEffect,
  Component
}

export default TinyReact;
