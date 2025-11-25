export default function DocumentsSection({ documents }) {
  return (
    <section className="py-6">
      <h2 className="text-2xl font-semibold mb-4">Documents</h2>
      <ul className="space-y-2">
        {documents.map((doc, i) => (
          <li key={i}>
            <a href={doc.link} className="text-blue-600 hover:underline">
              {doc.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
