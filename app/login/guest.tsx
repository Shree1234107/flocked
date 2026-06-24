import { LoginForm } from "../../components/LoginForm";

export default function GuestLoginScreen() {
  return (
    <LoginForm
      role="guest"
      title="Join as a Student"
      subtitle="Sign in to browse and join live classes."
    />
  );
}
