import { useEffect, useState } from "react";
import { getTodos, createTodo, updateTodo, deleteTodo } from "./api";
import { FILTERS } from "./filters";
import Sidebar from "./components/Sidebar";
import TodoForm from "./components/TodoForm";
import TodoItem from "./components/TodoItem";

const ITEMS_PER_PAGE = 10;

function App() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Shows an error in the banner (and logs it in the console)
  function showError(err) {
    console.error(err);
    setError(err.message);
  }

  // Load all todos once when the page opens
  useEffect(() => {
    async function loadTodos() {
      try {
        setError("");
        const data = await getTodos();
        setTodos(data);
      } catch (err) {
        showError(err);
      } finally {
        // Stop loading whether it worked or failed
        setLoading(false);
      }
    }

    loadTodos();
  }, []);

  // Reset to page 1 whenever the filter changes
  function handleFilterChange(newFilter) {
    setFilter(newFilter);
    setCurrentPage(1);
  }

  // Add a new todo to the top of the list
  async function handleAdd(title) {
    try {
      setError("");
      const newTodo = await createTodo(title);
      setTodos((prev) => [newTodo, ...prev]);
      setCurrentPage(1); // Jump to page 1 so the newly added task is immediately visible
    } catch (err) {
      showError(err);
    }
  }

  // Replace the edited todo with the updated version from the server
  async function handleUpdate(id, data) {
    try {
      setError("");
      const updated = await updateTodo(id, data);
      setTodos((prev) =>
        prev.map((todo) => (todo._id === id ? updated : todo))
      );
    } catch (err) {
      showError(err);
    }
  }

  // Remove one todo
  async function handleDelete(id) {
    try {
      setError("");
      await deleteTodo(id);
      setTodos((prev) => {
        const remaining = prev.filter((todo) => todo._id !== id);
        // If deleting the last item on the current page, step back one page
        const newTotalPages =
          Math.ceil(remaining.filter(FILTERS[filter].test).length / ITEMS_PER_PAGE) || 1;
        if (currentPage > newTotalPages) {
          setCurrentPage(newTotalPages);
        }
        return remaining;
      });
    } catch (err) {
      showError(err);
    }
  }

  // Remove every completed todo
  async function handleClearDone() {
    try {
      setError("");
      const doneTodos = todos.filter((todo) => todo.completed);

      for (const todo of doneTodos) {
        await deleteTodo(todo._id);
      }

      setTodos((prev) => prev.filter((todo) => !todo.completed));
      setCurrentPage(1);
    } catch (err) {
      showError(err);
    }
  }

  // Only the todos that match the selected filter
  const filteredTodos = todos.filter(FILTERS[filter].test);

  // "1 task" or "3 tasks"
  const taskWord = filteredTodos.length === 1 ? "task" : "tasks";

  // Pagination calculation
  const totalPages = Math.ceil(filteredTodos.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentTodos = filteredTodos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Decide what to show in the list area
  function renderTodos() {
    if (loading) {
      return <p className="empty">Loading...</p>;
    }

    if (filteredTodos.length === 0) {
      let message = "You're all caught up. Add a task above.";
      if (filter === "done") {
        message = "Nothing completed yet";
      }

      return (
        <div className="empty">
          <img src="/logo.png" alt="" />
          <p>{message}</p>
        </div>
      );
    }

    return (
      <>
        <ul className="todo-list">
          {currentTodos.map((todo) => (
            <TodoItem
              key={todo._id}
              todo={todo}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </ul>

        {/* Pagination buttons: « ‹ 1 2 3 ... › » */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              aria-label="First page"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={currentPage === pageNum ? "active" : ""}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Last page"
            >
              »
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="layout">
      <Sidebar
        todos={todos}
        filter={filter}
        onFilter={handleFilterChange}
        onClearDone={handleClearDone}
      />

      <main className="panel content">
        <header className="content-header">
          <h2>{FILTERS[filter].label}</h2>
          <span className="content-count">
            {filteredTodos.length} {taskWord}
          </span>
        </header>

        <TodoForm onAdd={handleAdd} />

        {error && (
          <div className="error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {renderTodos()}
      </main>
    </div>
  );
}

export default App;