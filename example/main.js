import TinyReact from "../src/index.js";

const {useState, useEffect, render, Component} = TinyReact;

class Comp1 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: ''
    }
  }

  componentDidMount() {
    console.log('Comp1 组件挂载完成')
  }

  componentDidUpdate(prevProps, prevState) {
    console.log('Comp1 组件更新完成:', prevProps, prevState)
  }

  render() {
    return (
      <div style="margin: 40px 20px;">
        <input type="text" value={this.state.data} onInput={(e) => {
          this.setState({
            data: e.target.value
          })
        }}/>
        <p>{this.props.label}: {this.state.data}</p>
      </div>
    );
  }
}


function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log('App 第一次挂载完成')
  }, [])

  useEffect(() => {
    console.log('App 更新完成')
  })

  useEffect(() => {
    console.log('count 更新:', count)
  }, [count])

  return (
    <div>
      <div style="margin: 20px;">
        <button onClick={() => setCount(count + 1)}>ADD</button>
        <span style="margin-left: 10px;">count: {count}</span>
      </div>
      <Comp1 label="Input"/>
    </div>
  )
}

render(
  <App/>,
  document.getElementById('root')
)
