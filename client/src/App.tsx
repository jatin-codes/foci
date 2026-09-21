import './App.css';
import { NewTodoForm } from './components/NewTodoForm/NewTodoForm.js';
import { SearchBar } from './components/SearchBar/SearchBar.js';
import { TodoFilters } from './components/TodoFilters/TodoFilters.js';
import { TodoList } from './components/TodoList/TodoList.js';
import { useApp } from './useApp.js';

export function App() {
  const { query, changeQuery, onSearch, listQuery } = useApp();

  return (
    <main>
      <h1>To-Do</h1>

      <NewTodoForm />
      <SearchBar onSearch={onSearch} />
      <TodoFilters {...query} onChange={changeQuery} />
      <TodoList query={listQuery} />
    </main>
  );
}
