import TinyReact from "../src";
const {
  useState,
  render
} = TinyReact;

function App() {
  const [count, setCount] = useState(0);
  return TinyReact.createElement("div", null, TinyReact.createElement("button", {
    onClick: () => setCount(count + 1)
  }, "ADD"), TinyReact.createElement("p", null, "count: ", count));
}

render(TinyReact.createElement(App, null), document.getElementById('root'));
