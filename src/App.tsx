import React, {Suspense} from "react"
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom"

import ErrorBanner from "@shared/ui/ErrorBanner/ErrorBanner"
import FullScreenLoader from "@shared/ui/FullScreenLoader/FullScreenLoader"

import {GlobalErrorProvider, useGlobalError} from "@shared/lib/errorContext"
import {ThemeProvider} from "@shared/lib/themeContext"

import {ThemeToggleButton} from "@features/themeSwitcher/ui/ThemeToggleButton"

import {ErrorBoundary} from "./app/ErrorBoundary"
const TracePage = React.lazy(() => import("./pages/TracePage/TracePage"))
const PlaygroundPage = React.lazy(() => import("./pages/PlaygroundPage/PlaygroundPage"))

function AppShell() {
  const {error, clearError, setError} = useGlobalError()

  return (
    <main>
      {error && <ErrorBanner message={error} onClose={clearError} />}

      <BrowserRouter>
        <ErrorBoundary
          resetKey={error}
          onError={err => {
            if (err instanceof Error) {
              setError(err.message)
            } else {
              setError("Unknown error")
            }
          }}
        >
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<FullScreenLoader baseMessage="Loading TxTracer..." />}>
                  <TracePage />
                </Suspense>
              }
            />
            <Route
              path="/play"
              element={
                <Suspense fallback={<FullScreenLoader baseMessage="Loading Playground..." />}>
                  <PlaygroundPage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>

      <ThemeToggleButton />
    </main>
  )
}

export default function App() {
  return (
    <GlobalErrorProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </GlobalErrorProvider>
  )
}
