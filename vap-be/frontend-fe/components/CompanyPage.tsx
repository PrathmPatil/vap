import StockChart from "./CompanyAnalysisClientPage";
import AboutSection from "./screener/AboutSection";
import CompanyHeader from "./screener/CompanyHeader";
import DocumentsSection from "./screener/DocumentsSection";
import FinancialTable from "./screener/FinancialTable";
import KeyMetricsGrid from "./screener/KeyMetricsGrid";
import PeerPills from "./screener/PeerPills";
import ProsCons from "./screener/ProsCons";
import TabsNav from "./screener/TabsNav";


export default function CompanyPage({ symbol }: { symbol: string }) {
    console.log("Rendering CompanyPage for symbol:", symbol);
  // Dummy Data (replace with API/db fetch later)
  const data = {
    header: {
      name: "Tata Consultancy Services",
      price: "₹3,871.15",
      change: "+0.5%",
      date: "06 Sep 2025",
    },
    tabs: [
      "Summary", "Chart", "Analysis", "Peers", "Quarters",
      "Profit & Loss", "Balance Sheet", "Cash Flow",
      "Ratios", "Investors", "Documents"
    ],
    about:
      "Tata Consultancy Services Limited (TCS) provides IT services, consulting, and business solutions globally.",
    metrics: [
      { label: "Market Cap", value: "₹14,20,000 Cr" },
      { label: "Current Price", value: "₹3,871.15" },
      { label: "High / Low", value: "₹4,254 / ₹3,313" },
      { label: "Stock P/E", value: "32.8" },
      { label: "Book Value", value: "₹280" },
      { label: "Dividend Yield", value: "1.4%" },
      { label: "ROCE", value: "55.8%" },
      { label: "ROE", value: "48.2%" },
      { label: "Face Value", value: "₹1" },
    ],
    pros: ["Strong brand presence", "High ROE and ROCE", "Regular dividend payout"],
    cons: ["High P/E ratio compared to industry", "Global slowdown risks"],
    peers: ["Infosys", "Wipro", "HCL Tech", "Tech Mahindra"],
    tables: [
      {
        title: "Quarterly Results",
        columns: ["Jun 23", "Sep 23", "Dec 23", "Mar 24"],
        rows: [
          { metric: "Sales", values: ["59,381", "60,698", "61,237", "62,728"] },
          { metric: "Expenses", values: ["40,211", "41,232", "41,789", "42,300"] },
          { metric: "Operating Profit", values: ["19,170", "19,466", "19,448", "20,428"] },
          { metric: "OPM %", values: ["32%", "32%", "32%", "33%"] },
        ],
      },
      {
        title: "Profit & Loss",
        columns: ["Mar 21", "Mar 22", "Mar 23", "Mar 24"],
        rows: [
          { metric: "Sales", values: ["1,67,311", "1,91,754", "2,25,458", "2,40,893"] },
          { metric: "Net Profit", values: ["32,430", "38,327", "42,303", "45,902"] },
          { metric: "EPS", values: ["85.8", "101.3", "112.6", "122.3"] },
        ],
      },
    ],
    documents: [
      { title: "Annual Report 2024", link: "#" },
      { title: "Q4 FY24 Results", link: "#" },
      { title: "Concall Transcript Q4 FY24", link: "#" },
    ],
  };

  return (
    <div className="">
      {/* <TabsNav tabs={data.tabs} /> */}
      {/* <CompanyHeader {...data.header} /> */}
      {/* <AboutSection text={data.about} /> */}
      <StockChart />
      {/* <KeyMetricsGrid metrics={data.metrics} /> */}
      <ProsCons pros={data.pros} cons={data.cons} />
      <PeerPills peers={data.peers} />

      {data.tables.map(({ title, columns, rows }) => (
        <section key={title} className="py-8">
          <h2 className="text-2xl font-semibold mb-4">{title}</h2>
          <FinancialTable columns={columns} data={rows} />
        </section>
      ))}

      <DocumentsSection documents={data.documents} />
    </div>
  );
}
