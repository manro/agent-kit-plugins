/** A variable holds a value its field refuses: fix the variable, since a retry fails the same. */
class EnvError extends Error {
  override readonly name = "EnvError";
}

export default EnvError;

declare module "@manro/lib-env" {
  namespace Env {
    namespace EnvError {
      type INSTANCE = EnvError;
    }
  }
}
