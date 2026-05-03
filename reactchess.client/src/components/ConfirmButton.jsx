import React, { useState, useEffect, useRef } from 'react';

const ConfirmButton = ({ onConfirm, title }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + rect.width / 2
            });
            position
        }
    }, [isOpen]);
    const handleConfirm = () => {
        onConfirm();
        setIsOpen(false);
    };

    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)}>
                {title}
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 70,
                    transform: 'translateX(-50%)',
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    padding: '10px',
                    zIndex: 10,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    borderRadius: '4px',
                    minWidth: '150px'
                }}>
                    <p>Вы уверены?</p>
                    <button onClick={handleConfirm} style={{ color: 'red' }}>Да</button>
                    <button onClick={() => setIsOpen(false)}>Нет</button>
                </div>
            )}
        </div>
    );
};

export default ConfirmButton;