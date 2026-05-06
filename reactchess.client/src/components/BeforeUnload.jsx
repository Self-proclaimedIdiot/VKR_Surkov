import ReactDOM from 'react-dom';
import React, {  useEffect } from 'react';
const useBeforeUnload = (when) => {
    useEffect(() => {
        if (!when) return;

        const handleBeforeUnload = (event) => {
            event.preventDefault();
            // Стандартный способ вызвать диалог в современных браузерах
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [when]);
};
export default useBeforeUnload