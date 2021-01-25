import TinyReact from "../src";
const {
  useState,
  render
} = TinyReact;

function App() {
  const [count, setCount] = useState(0);
  const [val, setVal] = useState('');
  return TinyReact.createElement("div", null, TinyReact.createElement("div", {
    style: "margin: 20px;"
  }, TinyReact.createElement("button", {
    onClick: () => setCount(count + 1)
  }, "ADD"), TinyReact.createElement("span", {
    style: "margin-left: 10px;"
  }, "count: ", count)), TinyReact.createElement("div", {
    style: "margin: 40px 20px;"
  }, TinyReact.createElement("input", {
    type: "text",
    value: val,
    onInput: e => {
      setVal(e.target.value);
    }
  }), TinyReact.createElement("p", null, "input value: ", val)));
}

render(TinyReact.createElement(App, null), document.getElementById('root'));
