import React from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private intervals: Set<NodeJS.Timeout> = new Set();
  private observers: Set<PerformanceObserver> = new Set();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring() {
    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      if (performance.memory) {
        const memory = performance.memory;
        this.metrics.set('memory_used', memory.usedJSHeapSize);
        this.metrics.set('memory_total', memory.totalJSHeapSize);
        this.metrics.set('memory_limit', memory.jsHeapSizeLimit);
        
        // Log warning if memory usage is high
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          console.warn(`High memory usage: ${usagePercent.toFixed(2)}%`);
        }
      }
    }, 5000);
    this.intervals.add(memoryInterval);

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.warn(`Long task detected: ${entry.duration}ms`, entry);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.add(longTaskObserver);
      } catch (e) {
        console.warn('Long task monitoring not supported');
      }
    }
  }

  stopMonitoring() {
    // Clear intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  logMetric(name: string, value: number) {
    this.metrics.set(name, value);
    console.log(`Performance Metric - ${name}: ${value}`);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();
  
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      monitor.startMonitoring();
      return () => monitor.stopMonitoring();
    }
  }, [monitor]);
}

// Debounce utility for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for frequent events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
