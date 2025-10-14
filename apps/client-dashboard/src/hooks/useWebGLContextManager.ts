import { useRef, useCallback, useEffect } from 'react';

interface WebGLContextManagerConfig {
  maxRetries?: number;
  retryDelay?: number;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onMaxRetriesReached?: () => void;
}

/**
 * Advanced WebGL Context Manager
 * Handles WebGL context loss/restoration with exponential backoff and retry logic
 */
export const useWebGLContextManager = (config: WebGLContextManagerConfig = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onContextLost,
    onContextRestored,
    onMaxRetriesReached
  } = config;

  const retryCountRef = useRef(0);
  const isRestoringRef = useRef(false);
  const contextRef = useRef<WebGLRenderingContext | null>(null);

  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault();
    
    console.warn(`🚨 WebGL context lost (attempt ${retryCountRef.current + 1}/${maxRetries})`);
    
    onContextLost?.();
    
    if (retryCountRef.current < maxRetries && !isRestoringRef.current) {
      isRestoringRef.current = true;
      
      // Exponential backoff for retry attempts
      const delay = retryDelay * Math.pow(2, retryCountRef.current);
      
      setTimeout(() => {
        retryCountRef.current++;
        
        // Attempt to restore context
        const loseContext = contextRef.current?.getExtension('WEBGL_lose_context');
        if (loseContext) {          loseContext.restoreContext();
        }
        
        isRestoringRef.current = false;
      }, delay);
    } else if (retryCountRef.current >= maxRetries) {
      console.error(`❌ WebGL context lost permanently after ${maxRetries} attempts`);
      onMaxRetriesReached?.();
    }
  }, [maxRetries, retryDelay, onContextLost, onMaxRetriesReached]);

  const handleContextRestored = useCallback(() => {    retryCountRef.current = 0;
    isRestoringRef.current = false;
    onContextRestored?.();
  }, [onContextRestored]);

  const registerWebGLContext = useCallback((gl: WebGLRenderingContext) => {
    contextRef.current = gl;
    
    // Remove existing listeners to prevent duplicates
    gl.canvas.removeEventListener('webglcontextlost', handleContextLost);
    gl.canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    
    // Add new listeners
    gl.canvas.addEventListener('webglcontextlost', handleContextLost, false);
    gl.canvas.addEventListener('webglcontextrestored', handleContextRestored, false);  }, [handleContextLost, handleContextRestored]);

  const cleanup = useCallback(() => {
    if (contextRef.current) {
      contextRef.current.canvas.removeEventListener('webglcontextlost', handleContextLost);
      contextRef.current.canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    }
  }, [handleContextLost, handleContextRestored]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    registerWebGLContext,
    cleanup,
    isRestoring: isRestoringRef.current,
    retryCount: retryCountRef.current,
    maxRetries
  };
};

