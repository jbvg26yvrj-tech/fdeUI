import { render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach,expect,it,vi } from 'vitest';
import LoginPage from '../features/auth/pages/LoginPage';
import RegistrationPage from '../features/auth/pages/RegistrationPage';
import { TransferScene } from '../features/auth/components/TransferScene';
const providers=vi.hoisted(()=>vi.fn());
vi.mock('../features/auth/api/authApi',()=>({authApi:{providers}}));
vi.mock('../context/AuthContext',()=>({useAuth:()=>({login:vi.fn()})}));
beforeEach(()=>{ providers.mockReset(); });
it('shows registration only when explicitly enabled',async()=>{
 providers.mockResolvedValue({ldapEnabled:false,registrationEnabled:true});
 render(<MemoryRouter><LoginPage/></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'Зарегистрироваться'})).toBeInTheDocument();
 expect(screen.queryByText('File Delivery Engine')).not.toBeInTheDocument();
 expect(screen.queryByText('Файлы движутся.')).not.toBeInTheDocument();
});
it('hides registration when disabled',async()=>{
 providers.mockResolvedValue({ldapEnabled:false,registrationEnabled:false});
 render(<MemoryRouter><LoginPage/></MemoryRouter>);
 await waitFor(()=>expect(providers).toHaveBeenCalled());
 expect(screen.queryByRole('link',{name:'Зарегистрироваться'})).not.toBeInTheDocument();
});
it('does not show a registration form at a direct URL when disabled',async()=>{
 providers.mockResolvedValue({ldapEnabled:false,registrationEnabled:false});
 render(<MemoryRouter><RegistrationPage/></MemoryRouter>);
 expect(await screen.findByText('Регистрация отключена администратором.')).toBeInTheDocument();
 expect(screen.queryByLabelText('Логин')).not.toBeInTheDocument();
});
it('fails closed when availability cannot be checked',async()=>{
 providers.mockRejectedValue(new Error('offline'));
 render(<MemoryRouter><RegistrationPage/></MemoryRouter>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось проверить');
 expect(screen.queryByRole('button',{name:'Зарегистрироваться'})).not.toBeInTheDocument();
});
it('allows pausing the decorative animation',async()=>{
 render(<TransferScene/>);
 await userEvent.click(screen.getByRole('button',{name:'Приостановить анимацию'}));
 expect(screen.getByRole('button',{name:'Продолжить анимацию'})).toHaveAttribute('aria-pressed','true');
});
