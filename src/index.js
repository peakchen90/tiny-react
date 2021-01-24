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

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom != null) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [
    fiber.type(fiber.props)
  ]
  reconcileChildren(fiber, children)
}

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
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
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
}

/**
 * 执行单元任务，并返回下一个待执行的任务
 * @param fiber
 * @return {null|*}
 */
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
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
  console.log('workLoop:', Date.now())
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function useState(initial) {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: []
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
    nextUnitOfWork = wipRoot;
    deletions = []
  }

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState]
}

const TinyReact = {
  createElement,
  render,
  useState
}

export default TinyReact;
