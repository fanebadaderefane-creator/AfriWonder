import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LivePage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/marketplace?tab=live", { replace: true });
  }, [navigate]);

  return null;
}
