import { useState } from 'react';
import './transfer-scene.css';
function Gear() {
 return <svg viewBox='0 0 64 64' className='transfer-gear' aria-hidden='true'><path d='M26 5h12l2 8 6 3 8-2 6 10-6 6v6l6 6-6 10-8-2-6 3-2 8H26l-2-8-6-3-8 2-6-10 6-6v-6l-6-6 6-10 8 2 6-3z' fill='none' stroke='currentColor' strokeWidth='2'/><circle cx='32' cy='33' r='10' fill='none' stroke='currentColor' strokeWidth='2'/></svg>;
}
function Files() { return <div className='transfer-files' aria-hidden='true'>{[0,1,2].map(i=><span key={i} className={`transfer-file transfer-file-${i}`}><i/><i/><i/></span>)}</div>; }
export function TransferScene() {
 const [paused,setPaused]=useState(false);
 return <section className={`transfer-scene${paused?' is-paused':''}`} aria-label='Передача файлов от отправителя через FDE получателю'>
   <div className='transfer-diagram' aria-hidden='true'>
     <div className='transfer-node'><Files/><Gear/><span>Отправитель</span></div>
     <div className='transfer-lane'><span className='transfer-packet'/><span className='transfer-packet delayed'/></div>
     <div className='transfer-node transfer-engine'><Gear/><strong>FDE</strong></div>
     <div className='transfer-lane second'><span className='transfer-packet'/><span className='transfer-packet delayed'/></div>
     <div className='transfer-node'><Files/><Gear/><span>Получатель</span></div>
   </div>
   <button className='transfer-pause' type='button' aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'Продолжить анимацию':'Приостановить анимацию'}</button>
 </section>;
}
