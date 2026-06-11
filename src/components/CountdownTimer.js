import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;

    const calculateTime = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      // Wenn die Zeit abgelaufen ist
      if (difference <= 0) {
        return 'Gesperrt';
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      // Formatierung je nach Restzeit
      if (days > 0) {
        return `${days}d ${hours}h`;
      }
      return `${hours}h ${minutes}min`;
    };

    // Initial setzen
    setTimeLeft(calculateTime());

    // Jede Minute aktualisieren reicht für die Sidebar völlig aus
    const timer = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 60000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) return null;

  const isExpired = timeLeft === 'Gesperrt';

  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: '700',
      padding: '2px 6px',
      borderRadius: '4px',
      marginLeft: '8px',
      backgroundColor: isExpired ? '#fee2e2' : '#e0f2fe',
      color: isExpired ? '#ef4444' : '#0369a1',
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      verticalAlign: 'middle',
      lineHeight: '1'
    }}>
      {timeLeft}
    </span>
  );
};

export default CountdownTimer;