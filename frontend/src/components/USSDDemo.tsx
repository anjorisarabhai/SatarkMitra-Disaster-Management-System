import { useState } from "react";

export default function USSDDemo() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");

  const sendUSSD = async () => {
    const res = await fetch("/ussd", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ text: input }),
    });

    const data = await res.text();
    setResponse(data);
  };

  return (
    <div className="p-4 bg-black text-green-400 rounded-lg w-80">
      <h2 className="text-sm mb-2">USSD Simulator</h2>

      <input
        className="w-full p-2 text-black"
        placeholder="Enter input (e.g. 1 or 2*Flood)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        className="mt-2 bg-green-600 px-3 py-1 rounded"
        onClick={sendUSSD}
      >
        Send
      </button>

      <pre className="mt-3 text-xs whitespace-pre-wrap">
        {response}
      </pre>
    </div>
  );
}