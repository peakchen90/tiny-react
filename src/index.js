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
    : document.createElement(filber.type)

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
    if (isEventProp(prop) && (!(prop in nextProps) || prevProps[prop] !== nextProps[prop])) { // remove event
      const eventType = getEventType(prop)
      dom.removeEventListener(eventType, prevProps[prop])
    }
    if (!(prop in nextProps)) { // remove property
      dom.removeAttribute(prop)
    } else if (prevProps[prop] !== nextProps[prop]) { // update property
      dom.setAttribute(prop, nextProps[prop])
    }
  })

  Object.keys(nextProps).forEach(prop => {
    if (prevProps[prop] !== nextProps[prop]) { // update property
      if (isEventProp(prop)) { // add event
        const eventType = getEventType(prop)
        dom.addEventListener(eventType, nextProps[prop])
      } else {
        dom.setAttribute(prop, nextProps[prop])
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

function commitWork(fiber) {
  if (!fiber) {
    return
  }

  let domParentFiber = fiber.parent;
  while (!domParentFiber) {
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
  commitWork(fiber.subling)
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

function reconcileChildren(fiber, children) {
  let index = 0;
  let oldFiber = wipFiber && wipFiber.alternate && wipFiber.alternate.child
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
      wipFiber.child = newFiber
    } else {
      prevSibling.sibing = newFiber
    }

    prevSibling = newFiber
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

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

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

function useState(initial) {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: []
  }

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

requestIdleCallback(workLoop)

const TinyReact = {
  createElement,
  render,
  useState
}

export default TinyReact;
