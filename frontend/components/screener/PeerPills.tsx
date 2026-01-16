interface PeerPillsProps {
  peers: string[];
}
export default function PeerPills({ peers }: PeerPillsProps) {
  return (
    <div className="flex flex-wrap gap-2 py-6">
      {peers.map((peer) => (
        <span
          key={peer}
          className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 cursor-pointer"
        >
          {peer}
        </span>
      ))}
    </div>
  );
}
