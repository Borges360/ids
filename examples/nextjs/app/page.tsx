'use client';
import { useState } from 'react';
import { TextField, Button } from '@inteiro/react';
export default function Page() {
  const [saved,setSaved] = useState(false);
  return <main className="in-container"><h1>Next fixture</h1><form onSubmit={event=>{event.preventDefault();setSaved(true);}}><TextField label="Nome" required/><Button type="submit">Salvar rascunho</Button>{saved&&<p role="status">Rascunho salvo</p>}</form></main>;
}
