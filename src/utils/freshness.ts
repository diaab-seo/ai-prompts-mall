/**
 * Freshness scoring — rates how "fresh" a repo is based on push activity.
 * Used for TrendingBadge and freshness signals.
 */

export interface FreshnessScore {
  score: number;       // 0–100
  label: 'hot' | 'active' | 'stable' | 'stale' | 'archived';
  isTrending: boolean;
}

export function scoreFreshness(pushedAt: string, stars: number, archived = false): FreshnessScore {
  if (archived) return { score: 0, label: 'archived', isTrending: false };

  const daysSincePush = (Date.now() - new Date(pushedAt).getTime()) / 86400000;
  let score = 100;

  if (daysSincePush > 365) score -= 50;
  else if (daysSincePush > 180) score -= 30;
  else if (daysSincePush > 90) score -= 15;
  else if (daysSincePush > 30) score -= 5;

  // Stars bonus (log scale)
  const starsBonus = Math.min(30, Math.log10(Math.max(1, stars)) * 10);
  score = Math.min(100, score + starsBonus);

  const label: FreshnessScore['label'] =
    score >= 80 ? 'hot' :
    score >= 60 ? 'active' :
    score >= 40 ? 'stable' :
    'stale';

  return { score: Math.round(score), label, isTrending: score >= 85 };
}
