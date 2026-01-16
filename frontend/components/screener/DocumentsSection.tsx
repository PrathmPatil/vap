interface DocumentItem {
  title: string;
  link: string;
}

interface DocumentsSectionProps {
  documents: DocumentItem[];
}

export default function DocumentsSection({ documents }: DocumentsSectionProps) {
  return (
    <section className="py-6">
      <h2 className="text-2xl font-semibold mb-4">Documents</h2>

      {documents.length === 0 ? (
        <p className="text-gray-500">No documents available.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc, i) => (
            <li key={i}>
              <a
                href={doc.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {doc.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
