import { useEffect } from 'react';

const useScript = (url, cb, dep) => {
  useEffect(() => {
    const script = document.createElement('script');

    script.src = url;
    script.async = true;
    //script.onload = () => {console.log('loaded '+url)};
    script.onload = cb;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    }
  }, dep);
};

export default useScript;