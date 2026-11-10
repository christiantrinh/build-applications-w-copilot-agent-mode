import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = { title: string; focus?: string; reason?: string };

export default function Workouts() {
  const [workouts, setWorkouts] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com')
      .then((payload) => {
        if (!active) return;
        setWorkouts(payload.suggestions ?? []);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError('Unable to load workouts');
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
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      loading={loading}
      error={error}
      emptyText="No workout suggestions"
    >
      {workouts.length === 0 ? <p>No workout suggestions</p> : (
        <ul className="list-group list-group-flush">
          {workouts.map((workout, index) => (
            <li key={`${workout.title}-${index}`} className="list-group-item">
              <strong>{workout.title}</strong>
              {workout.focus ? <div>{workout.focus}</div> : null}
              {workout.reason ? <small className="d-block">{workout.reason}</small> : null}
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
