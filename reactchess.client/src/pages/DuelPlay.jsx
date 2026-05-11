import React/*, { useState, useEffect, useMemo }*/ from 'react';
import { useParams } from 'react-router-dom';
const DuelPlay = () => {
    const { opponentId, formatId } = useParams();
    return (
        <div>«десь могла быть игра с {opponentId} в формате {formatId}</div>
    )
}
export default DuelPlay