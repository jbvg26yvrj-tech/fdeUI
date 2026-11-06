import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Modal } from './Modal';
it('closes only the top dialog on Escape and restores focus to its opener', () => {
  function Example() {
    const [outer, setOuter] = useState(true);
    const [inner, setInner] = useState(false);
    return <Modal isOpen={outer} onClose={() => setOuter(false)} title="Parent" variant="custom">
      <button onClick={() => setInner(true)}>Open child</button>
      <Modal isOpen={inner} onClose={() => setInner(false)} title="Child" variant="custom"><input aria-label="Value" /></Modal>
    </Modal>;
  }
  render(<Example />);
  const opener = screen.getByRole('button', {name: 'Open child'});
  opener.focus(); fireEvent.click(opener);
  expect(screen.getAllByRole('dialog')).toHaveLength(2);
  fireEvent.keyDown(document, {key: 'Escape'});
  expect(screen.getByRole('dialog', {name: 'Parent'})).toBeInTheDocument();
  expect(screen.queryByRole('dialog', {name: 'Child'})).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
