export default function USSDAlert() {
  return (
    <div className="bg-yellow-100 border border-yellow-300 p-3 rounded-lg text-sm flex items-center justify-between">
      
      <span>
        📞 No internet? Dial <b>*384*41482#</b> for offline support
      </span>

      <a
        href="tel:*123%23"
        className="text-blue-600 font-semibold underline"
      >
        Dial Now
      </a>

    </div>
  );
}