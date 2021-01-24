import TinyReact from "../src";

const {useState, render} = TinyReact;

function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>ADD</button>
      <p>count: {count}</p>
    </div>
  )
}

render(
  <App/>,
  document.getElementById('root')
)
