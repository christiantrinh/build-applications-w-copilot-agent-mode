import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamItem = { name: string; mascot?: string; members?: Array<string | { _id?: string; toString?: () => string }> };

export default function Teams() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ teams: TeamItem[] }>('/api/teams')
      .then((payload) => {
        if (!active) return;
        setTeams(payload.teams ?? []);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError('Unable to load teams');
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
      title="Teams"
      description="Manage teams and members."
      loading={loading}
      error={error}
      emptyText="No teams"
    >
      {teams.length === 0 ? <p>No teams</p> : (
        <ul className="list-group list-group-flush">
          {teams.map((team, index) => (
            <li key={`${team.name}-${index}`} className="list-group-item">
              <strong>{team.name}</strong> · {team.mascot ?? 'Mascot'}
              <div>{(team.members ?? []).length} members</div>
            </li>
          ))}
        </ul>
      )}
    </CapabilityCard>
  );
}
