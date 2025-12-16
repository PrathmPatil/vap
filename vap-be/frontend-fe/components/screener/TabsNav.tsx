interface TabsNavProps {
  tabs: string[];
}
export default function TabsNav({ tabs }: TabsNavProps) {
  return (
    <div className="flex gap-4 overflow-x-auto py-4 border-b">
      {tabs.map((tab) => (
        <button
          key={tab}
          className="px-4 py-2 text-sm font-medium hover:text-blue-600 whitespace-nowrap"
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
