import TinyReact from "../src";
const {
  useState,
  useEffect,
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

  componentDidMount() {
    console.log('Comp1 组件挂载完成');
  }

  componentDidUpdate(prevProps, prevState) {
    console.log('Comp1 组件更新完成:', prevProps, prevState);
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
  useEffect(() => {
    console.log('App 第一次挂载完成');
  }, []);
  useEffect(() => {
    console.log('App 更新完成');
  });
  useEffect(() => {
    console.log('count 更新:', count);
  }, [count]);
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
