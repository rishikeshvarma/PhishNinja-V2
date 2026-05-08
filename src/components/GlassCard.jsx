import React from 'react';

const GlassCard = ({ children, className = '', glow = false }) => {
  return (
    <div className={`glass-panel rounded-2xl ${glow ? 'glow-accent' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;
