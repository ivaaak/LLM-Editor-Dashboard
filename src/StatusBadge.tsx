import React from 'react';
import ui from './common.module.css';
import type { ModelStatus, RunStatus } from '../shared/types';

interface StatusBadgeProps {
    status: ModelStatus | RunStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
    <span className={`${ui.badge} ${ui[status]}`}>{status}</span>
);

export default StatusBadge;
