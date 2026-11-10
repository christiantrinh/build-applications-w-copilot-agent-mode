import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityItem = { type: string; minutes: number; points?: number };

export default function Activities() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ activities: ActivityItem[] }>('/api/activities')
      .then((payload) => {
        if (!active) return;
        setActivities(payload.activities ?? []);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError('Unable to load activities');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard
      title="Activities"
      description="Track student activity minutes and points."
      loading={loading}
      error={error}
      emptyText="No activities"
    >
      {activities.length === 0 ? <p>No activities</p> : (
        <ul className="list-group list-group-flush">
          {activities.map((activity, index) => (
            <li key={`${activity.type}-${index}`} className="list-group-item">
              <strong>{activity.type}</strong> · {activity.minutes} minutes · {activity.points ?? 0} points
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
