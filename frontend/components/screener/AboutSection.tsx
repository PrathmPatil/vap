interface AboutSectionProps {
  text: string;
}

export default function AboutSection({ text }: AboutSectionProps) {
  return (
    <section className="flex items-center gap-2">
      <h2 className="text-2xl font-semibold mb-2">About</h2>
      <p className="text-gray-700">{text}</p>
    </section>
  );
}
