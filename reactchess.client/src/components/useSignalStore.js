import { create } from 'zustand';

// create — это функция из библиотеки, которая генерирует ваш хук
const useSignalStore = create((set) => ({
    // 1. Само состояние (на старте соединения нет)
    connection: null,

    // 2. Экшены (функции для изменения состояния)
    setConnection: (newConn) => set({ connection: newConn }),

    // Можно добавить функцию для сброса
    clearConnection: () => set({ connection: null }),
    // 1. Само состояние (на старте соединения нет)
    chessConnection: null,

    // 2. Экшены (функции для изменения состояния)
    setChessConnection: (newConn) => set({ chessConnection: newConn }),

    // Можно добавить функцию для сброса
    clearChessConnection: () => set({ chessConnection: null })

}));

export default useSignalStore;