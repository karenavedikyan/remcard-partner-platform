import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";

const mocks = vi.hoisted(() => ({
  current: vi.fn(), all: vi.fn(), push: vi.fn(), refresh: vi.fn(), auth: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  usePathname: () => "/admin/overview",
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({cookie:"qa-cookie-not-a-real-session"}),
}));
vi.mock("@/lib/remcard-server", () => ({ getAuthMeServer: mocks.auth }));
vi.mock("@/lib/account-session-exit", () => ({
  ACCOUNT_SESSION_BROADCAST:"qa-admin-session-exit",
  clearLocalSessionArtifacts:vi.fn(async()=>{}),
  notifyAccountSessionExit:vi.fn(),
  postLogoutCurrentDevice:mocks.current,
  postLogoutAllDevices:mocks.all,
  tryBeginAccountExit:vi.fn(()=>true),
  endAccountExit:vi.fn(),
}));

import { AdminHeader } from "./AdminHeader";
import AdminLayout from "./layout";
import SignedOutPage from "@/app/account/signed-out/page";

const identity = {displayName:"Проверочный администратор",staffRole:"ADMIN" as const};
const header = () => render(<ThemeProvider><AdminHeader identity={identity}/></ThemeProvider>);
beforeEach(()=>{
  vi.clearAllMocks();
  mocks.current.mockResolvedValue(undefined);
  mocks.all.mockResolvedValue(undefined);
  localStorage.clear();
  localStorage.setItem("remcard-theme","light");
  document.documentElement.dataset.theme="light";
});

describe("Admin shared platform controls",()=>{
  it("uses the real persistent theme toggle, including after remount",async()=>{
    const view=header();
    fireEvent.click(screen.getByRole("button",{name:"Включить тёмную тему"}));
    await waitFor(()=>expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(localStorage.getItem("remcard-theme")).toBe("dark");
    view.unmount();
    header();
    await screen.findByRole("button",{name:"Включить светлую тему"});
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("shows the actual admin identity and both shared exit actions",()=>{
    header();
    fireEvent.click(screen.getByRole("button",{name:"Меню аккаунта"}));
    expect(screen.getByRole("menu")).toHaveTextContent("Проверочный администратор");
    expect(screen.getByRole("menu")).toHaveTextContent("Администратор платформы");
    expect(screen.getByTestId("account-logout")).toBeTruthy();
    expect(screen.getByTestId("account-logout-all")).toBeTruthy();
    expect(mocks.current).not.toHaveBeenCalled();
    expect(mocks.all).not.toHaveBeenCalled();
  });
  it("logs out the current device and preserves admin sign-in context",async()=>{
    header();
    fireEvent.click(screen.getByRole("button",{name:"Меню аккаунта"}));
    fireEvent.click(screen.getByTestId("account-logout"));
    await waitFor(()=>expect(mocks.push).toHaveBeenCalledWith("/account/signed-out?scope=current&mode=admin"));
    expect(mocks.current).toHaveBeenCalledTimes(1);
    expect(mocks.all).not.toHaveBeenCalled();
  });
  it("does not revoke any sessions when global exit is cancelled",()=>{
    header();
    fireEvent.click(screen.getByRole("button",{name:"Меню аккаунта"}));
    fireEvent.click(screen.getByTestId("account-logout-all"));
    expect(mocks.all).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("logout-all-cancel"));
    expect(mocks.all).not.toHaveBeenCalled();
    expect(mocks.current).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("revokes all devices only after confirmation and keeps admin entry",async()=>{
    header();
    fireEvent.click(screen.getByRole("button",{name:"Меню аккаунта"}));
    fireEvent.click(screen.getByTestId("account-logout-all"));
    expect(mocks.all).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("logout-all-confirm"));
    await waitFor(()=>expect(mocks.push).toHaveBeenCalledWith("/account/signed-out?scope=all&mode=admin"));
    expect(mocks.all).toHaveBeenCalledTimes(1);
    expect(mocks.current).not.toHaveBeenCalled();
  });
  it("shows an exit error without falsely navigating to signed-out",async()=>{
    mocks.current.mockRejectedValue(new Error("qa-offline"));
    header();
    fireEvent.click(screen.getByRole("button",{name:"Меню аккаунта"}));
    fireEvent.click(screen.getByTestId("account-logout"));
    await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("Не удалось выйти"));
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("supports Escape and restores focus to the menu trigger",()=>{
    header();
    const trigger=screen.getByRole("button",{name:"Меню аккаунта"});
    fireEvent.click(trigger);
    fireEvent.keyDown(document,{key:"Escape"});
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });
  it("preserves admin navigation and site/cabinet links without mounting partner inbox",()=>{
    header();
    expect(screen.getByRole("link",{name:"Партнёры"})).toHaveAttribute("href","/admin/partners");
    expect(screen.getByRole("link",{name:"Пароль"})).toHaveAttribute("href","/admin/password");
    expect(screen.getByRole("link",{name:"Кабинет"})).toHaveAttribute("href","/profile");
    expect(screen.getByRole("link",{name:"Сайт RemCard"})).toHaveAttribute("href","https://remcard.ru");
    expect(screen.queryByRole("button",{name:/Уведомления/})).toBeNull();
  });
});

describe("Admin server identity and signed-out entry",()=>{
  it.each(["ADMIN","OWNER"])("supplies only verified %s identity to shared controls",async(staffRole)=>{
    mocks.auth.mockResolvedValue({ok:true,data:{user:{id:"qa-admin",displayName:" Проверочный администратор ",staffRole}}});
    render(<ThemeProvider>{await AdminLayout({children:<p>Проверочная страница</p>})}</ThemeProvider>);
    expect(mocks.auth).toHaveBeenCalledWith("qa-cookie-not-a-real-session");
    fireEvent.click(screen.getByRole("button",{name:"Меню аккаунта"}));
    expect(screen.getByRole("menu")).toHaveTextContent(staffRole==="OWNER"?"Владелец платформы":"Администратор платформы");
  });
  it.each([
    {ok:false,status:401},
    {ok:true,data:{user:{id:"qa-partner",displayName:"Не администратор",role:"PRO",staffRole:null}}},
  ])("does not invent admin identity when auth is $ok",async(auth)=>{
    mocks.auth.mockResolvedValue(auth);
    render(<ThemeProvider>{await AdminLayout({children:<p>Проверочная страница</p>})}</ThemeProvider>);
    expect(screen.queryByRole("button",{name:"Меню аккаунта"})).toBeNull();
    expect(screen.getByTestId("theme-toggle")).toBeTruthy();
  });
  it("handles an empty verified display name without using a partner brand",async()=>{
    mocks.auth.mockResolvedValue({ok:true,data:{user:{id:"qa-admin",displayName:"  ",staffRole:"ADMIN"}}});
    render(<ThemeProvider>{await AdminLayout({children:null})}</ThemeProvider>);
    expect(screen.getByText("Администратор RemCard")).toBeTruthy();
  });
  it("offers the dedicated admin login after admin exit",async()=>{
    render(await SignedOutPage({searchParams:Promise.resolve({scope:"current",mode:"admin"})}));
    expect(screen.getByRole("link",{name:"Войти в кабинет администратора"})).toHaveAttribute("href","/login?mode=admin&returnTo=%2Fadmin%2Fpartners");
  });
  it("keeps ordinary partner sign-in unchanged",async()=>{
    render(await SignedOutPage({searchParams:Promise.resolve({scope:"current"})}));
    expect(screen.getByRole("link",{name:"Войти в аккаунт"})).toHaveAttribute("href","/login");
  });
});
