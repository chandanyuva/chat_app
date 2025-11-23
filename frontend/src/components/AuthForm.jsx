import { useState } from "react";

function AuthForm({ mode, onSubmit }) {
  const [email, setEmail] = useState("");
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === "signup") {
      onSubmit({ email, username, password });
    } else {
      onSubmit({ email, password });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>{mode === "signup" ? "Signup" : "Login"}</h2>

      <input value={email} placeholder="email"
        onChange={e => setEmail(e.target.value)} />

      {mode === "signup" && (
        <input value={username} placeholder="username"
          onChange={e => setUserName(e.target.value)} />
      )}

      <input type="password" value={password} placeholder="password"
        onChange={e => setPassword(e.target.value)} />

      <button type="submit">
        {mode === "signup" ? "Create Account" : "Login"}
      </button>
    </form>
  );
}

export default AuthForm;

