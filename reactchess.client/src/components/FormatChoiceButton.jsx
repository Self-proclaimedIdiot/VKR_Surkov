import React, { useState, useEffect, useRef } from 'react';
import useSignalStore from './useSignalStore.js';
const FormatChoiceButton = ({ title, formats, opponentId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const connection = useSignalStore((state) => state.connection);
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
    const StartFormat = (formatId) => {
        connection.invoke("SendGameInvite", opponentId, formatId);
    };

    return (
        <div>
            <button className="btn btn-secondary"  onClick={() => setIsOpen(!isOpen)}>
                {title}
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 70,
                    transform: 'translateX(-50%)',
                    backgroundColor: '#0e0f13',
                    border: '1px solid #ccc',
                    padding: '10px',
                    zIndex: 10,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    borderRadius: '4px',
                    minWidth: '150px'
                }}>
                    <p>Выберите формат</p>
                    {formats.map(format => {
                        return (
                            <button className= "btn btn-secondary"onClick={() => StartFormat(format.id)}>
                                {format.name}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default FormatChoiceButton;