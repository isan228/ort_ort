import { useEffect, useState } from 'react';
import { api, getStoredUser } from '../api/client.js';

export function useFeatureAccess() {
  const userId = getStoredUser()?.id ?? null;
  const loggedIn = Boolean(userId);
  const [loading, setLoading] = useState(loggedIn);
  const [access, setAccess] = useState({
    premium: false,
    has_full_access: false,
    has_scores: false,
    can_analyze: false,
    can_use_tours: false,
    can_view_rankings: false,
    can_use_community: false,
    can_use_catalog: false,
    analysis_blocked_reason: loggedIn ? null : 'auth',
  });

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      setAccess({
        premium: false,
        has_full_access: false,
        has_scores: false,
        can_analyze: false,
        can_use_tours: false,
        can_view_rankings: false,
        can_use_community: false,
        can_use_catalog: false,
        analysis_blocked_reason: 'auth',
      });
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    api
      .getAnalysisContext()
      .then((ctx) => {
        if (cancelled) return;
        const premium = Boolean(ctx.premium);
        setAccess({
          premium,
          has_full_access: Boolean(ctx.has_full_access ?? premium),
          has_scores: Boolean(ctx.has_scores),
          can_analyze: Boolean(ctx.can_analyze),
          can_use_tours: Boolean(ctx.can_use_tours),
          can_view_rankings: Boolean(ctx.can_view_rankings),
          can_use_community: Boolean(ctx.can_use_community ?? premium),
          can_use_catalog: Boolean(ctx.can_use_catalog ?? premium),
          analysis_blocked_reason: ctx.analysis_blocked_reason || null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAccess({
          premium: false,
          has_full_access: false,
          has_scores: false,
          can_analyze: false,
          can_use_tours: false,
          can_view_rankings: false,
          can_use_community: false,
          can_use_catalog: false,
          analysis_blocked_reason: 'subscription',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loggedIn, userId]);

  return { ...access, loading, loggedIn };
}
