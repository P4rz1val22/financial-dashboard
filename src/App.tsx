import StockCard from "@/components/stock-card";
import { stockService } from "@/services/stockService";

function App() {
  return (
    <div className="p-4 bg-gray-200 flex flex-col gap-2 w-screen h-screen">
      <div className="bg-white rounded-lg shadow-md p-4 transition ">
        <h1 className="text-3xl font-bold text-gray-800">
          Financial Dashboard
        </h1>
      </div>
      <div className="bg-white rounded-lg shadow-md p-2 transition">
        <h1 className="text-xl font-light text-gray-800">
          <input
            className="w-full focus-visible:!!!ring-offset-8 p-2"
            placeholder={"Search for a Stock"}
          ></input>
        </h1>
      </div>
      <div className="w-full grid-cols-3 gap-2 grid">
        <StockCard symbol={"AAPL"} />
      </div>
    </div>
  );
}

export default App;
