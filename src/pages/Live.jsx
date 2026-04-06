// Live.jsx — point d'entree canonique vers la page des lives
// Redirige vers Lives (listing) au lieu de l'ancienne URL marketplace
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LivePage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/Lives", { replace: true });
  }, [navigate]);

  return null;
}
