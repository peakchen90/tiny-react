import TinyReact from "../src";

const {useState, render} = TinyReact;

function App() {
  const [count, setCount] = useState(0)
  const [val, setVal] = useState('')

  return (
    <div>
      <div style="margin: 20px;">
        <button onClick={() => setCount(count + 1)}>ADD</button>
        <span style="margin-left: 10px;">count: {count}</span>
      </div>
      <div style="margin: 40px 20px;">
        <input type="text" value={val} onInput={(e) => {
          setVal(e.target.value)
        }}/>
        <p>input value: {val}</p>
      </div>
    </div>
  )
}

render(
  <App/>,
  document.getElementById('root')
)
