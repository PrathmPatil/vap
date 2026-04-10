import axios from "axios";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getMarketHolidays } from "@/utils";

const MasterIndex = () => {
  const [logsData, setLogsData] = useState([]);
  const [isCronFailed, setIsCronFailed] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 0,
  });

  useEffect(() => {
    fetchLogsData();
  }, [pagination.page, pagination.limit]);

  const fetchLogsData = async () => {
    try {
      const response = await getMarketHolidays();
      const { success, data, pagination, message } = response;
      console.log("Cron Logs API Response:", response);
        if (!success) {
          throw new Error(`HTTP error! status: ${message || 'Unknown error'}`);
        }
      setLogsData(data);
      setPagination(pagination);
    } catch (error) {
      setIsCronFailed(true);
      setLogsData([]);
      setPagination({ total: 0, page: 1, limit: 10, total_pages: 0 });
    }
  };

  const runManualApi = async () => {
    try {
      const response = await axios.get("/vap/formula/run-manual-api");
      setIsCronFailed(false);
    } catch (error) {
      setIsCronFailed(true);
    }
  };

  return (
    <div>
      <h1>Master Index</h1>
      <ul>
        {logsData.map((log) => (
          <li key={log.id}>
            {log.created_at} - {log.message}
          </li>
        ))}
      </ul>
      {isCronFailed && <Button onClick={runManualApi}>Run Manual API</Button>}
    </div>
  );
};

export default MasterIndex;
