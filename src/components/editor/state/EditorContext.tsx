import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from "react";
import { editorReducer, initialState } from "./editorReducer";
import type { EditorState, EditorAction } from "./editorTypes";

const EditorStateCtx = createContext<EditorState>(initialState);
const EditorDispatchCtx = createContext<Dispatch<EditorAction>>(() => {});

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  return (
    <EditorStateCtx.Provider value={state}>
      <EditorDispatchCtx.Provider value={dispatch}>
        {children}
      </EditorDispatchCtx.Provider>
    </EditorStateCtx.Provider>
  );
}

export function useEditorState() {
  return useContext(EditorStateCtx);
}

export function useEditorDispatch() {
  return useContext(EditorDispatchCtx);
}
