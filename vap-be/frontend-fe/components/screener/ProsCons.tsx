interface ProsConsProps {
  pros: string[];
  cons: string[];
}
export default function ProsCons({ pros, cons }: ProsConsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
      <div>
        <h3 className="text-lg font-semibold text-green-600">Pros</h3>
        <ul className="list-disc list-inside text-gray-700">
          {pros.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-red-600">Cons</h3>
        <ul className="list-disc list-inside text-gray-700">
          {cons.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
