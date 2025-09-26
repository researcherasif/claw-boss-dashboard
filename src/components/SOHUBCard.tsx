import React from 'react';

interface SOHUBCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const SOHUBCard: React.FC<SOHUBCardProps> = ({ 
  children, 
  className = "", 
  title, 
  subtitle, 
  icon 
}) => {
  return (
    <div className={`sohub-card ${className}`}>
      {(title || subtitle || icon) && (
        <div className="flex items-center gap-3 mb-4">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              {icon}
            </div>
          )}
          <div>
            {title && (
              <h3 className="text-white font-semibold text-lg">{title}</h3>
            )}
            {subtitle && (
              <p className="text-gray-400 text-sm">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

interface GlowSwitchProps {
  isActive: boolean;
  onToggle: () => void;
  label?: string;
}

export const GlowSwitch: React.FC<GlowSwitchProps> = ({ 
  isActive, 
  onToggle, 
  label = "Switch" 
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className={`glow-switch ${isActive ? 'active' : 'inactive'}`}
        onClick={onToggle}
      >
        <span className="glow-switch-text">
          {isActive ? 'ON' : 'OFF'}
        </span>
      </div>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
  );
};

interface CircularProgressProps {
  value: number;
  max?: number;
  label?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({ 
  value, 
  max = 100, 
  label 
}) => {
  const percentage = (value / max) * 100;
  const rotation = (percentage / 100) * 360;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="circular-progress"
        style={{
          background: `conic-gradient(#00d4ff ${rotation}deg, #374151 ${rotation}deg)`
        }}
      >
        <span className="circular-progress-text">{value}{label || '%'}</span>
      </div>
    </div>
  );
};