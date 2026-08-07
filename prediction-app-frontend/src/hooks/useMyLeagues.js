import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";

// Loads the leagues the signed-in user belongs to and remembers which one
// they last viewed, so the Home and Results pages stay in sync.
export function useMyLeagues(user) {
  const [leagues, setLeagues] = useState([]);
  const [leagueId, setLeagueIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLeagues([]);
      setLeagueIdState(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .get("/api/leagues")
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setLeagues(list);
        const remembered = localStorage.getItem("activeLeagueId");
        const pick = list.find((l) => l._id === remembered) || list[0];
        setLeagueIdState(pick ? pick._id : null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLeagues([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const setLeagueId = useCallback((id) => {
    setLeagueIdState(id);
    localStorage.setItem("activeLeagueId", id);
  }, []);

  const league = leagues.find((l) => l._id === leagueId) || null;

  return { leagues, league, leagueId, setLeagueId, loading };
}
