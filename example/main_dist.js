import TinyReact from "../src";
const {
  useState,
  render,
  Component
} = TinyReact;

class Comp1 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: ''
    };
  }

  render() {
    return TinyReact.createElement("div", {
      style: "margin: 40px 20px;"
    }, TinyReact.createElement("input", {
      type: "text",
      value: this.state.data,
      onInput: e => {
        this.setState({
          data: e.target.value
        });
      }
    }), TinyReact.createElement("p", null, this.props.label, ": ", this.state.data));
  }

}

function App() {
  const [count, setCount] = useState(0);
  return TinyReact.createElement("div", null, TinyReact.createElement("div", {
    style: "margin: 20px;"
  }, TinyReact.createElement("button", {
    onClick: () => setCount(count + 1)
  }, "ADD"), TinyReact.createElement("span", {
    style: "margin-left: 10px;"
  }, "count: ", count)), TinyReact.createElement(Comp1, {
    label: "Input"
  }));
}

render(TinyReact.createElement(App, null), document.getElementById('root'));
