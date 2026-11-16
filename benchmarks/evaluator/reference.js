// Evaluator self-tests only. Never include this implementation in a worker context.
const byText = (text) =>
  [...document.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === text,
  );
const get = async (path, method = "GET", body) => {
  const response = await fetch(path, {
    method,
    ...(body
      ? {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok) throw Error("synthetic response error");
  return data;
};
const form = document.querySelector("form"),
  status = document.querySelector('[role="status"]');
function modal(trigger, dialog, first, close) {
  const finish = () => {
    dialog.close();
    trigger.focus();
  };
  trigger.onclick = () => {
    dialog.showModal();
    first.focus();
  };
  close.onclick = finish;
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [
      ...dialog.querySelectorAll("input,button,a[href],select,textarea"),
    ];
    if (event.shiftKey && document.activeElement === controls[0]) {
      event.preventDefault();
      controls.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
      event.preventDefault();
      controls[0].focus();
    }
  });
}
switch (benchmarkCase) {
  case "task-01": {
    const name = document.querySelector("#name"),
      email = document.querySelector("#email");
    name.required = email.required = true;
    form.onsubmit = async (event) => {
      event.preventDefault();
      await get("/api/users", "POST", { name: name.value, email: email.value });
      status.textContent = "Cadastro criado";
    };
    break;
  }
  case "task-02": {
    const list = document.querySelector("ul"),
      previous = byText("Página anterior"),
      next = byText("Próxima página");
    let page = 1;
    async function load() {
      const data = await get("/api/people?page=" + page);
      list.replaceChildren(
        ...data.items.map((item) => {
          const li = document.createElement("li");
          li.textContent = item.name;
          return li;
        }),
      );
      status.textContent = `Página ${page} de ${data.totalPages}`;
      previous.disabled = page === 1;
      next.disabled = page === data.totalPages;
    }
    previous.onclick = () => {
      page--;
      load();
    };
    next.onclick = () => {
      page++;
      load();
    };
    load();
    break;
  }
  case "task-03": {
    async function load() {
      const data = await get("/api/dashboard");
      for (const key of ["total", "active", "overdue"])
        document.querySelector(`[data-testid="kpi-${key}"]`).textContent =
          data[key];
    }
    byText("Atualizar dados").onclick = load;
    load();
    break;
  }
  case "task-04": {
    const trigger = byText("Abrir navegação"),
      navigation = document.querySelector("nav");
    navigation.hidden = innerWidth < 768;
    trigger.hidden = innerWidth >= 768;
    trigger.onclick = () => {
      navigation.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      navigation.querySelector("a").focus();
    };
    navigation.onkeydown = (event) => {
      if (event.key === "Escape") {
        navigation.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      }
    };
    break;
  }
  case "task-05": {
    const input = document.querySelector("#name"),
      list = document.querySelector("ul"),
      submit = byText("Adicionar item"),
      dialog = document.querySelector("dialog");
    let items = [],
      editing = null,
      deleting = null;
    const render = () => {
      list.replaceChildren(
        ...items.map((item) => {
          const li = document.createElement("li"),
            text = document.createElement("span"),
            edit = document.createElement("button"),
            remove = document.createElement("button");
          text.textContent = item.name;
          edit.textContent = "Editar " + item.name;
          remove.textContent = "Excluir " + item.name;
          edit.onclick = () => {
            editing = item.id;
            input.value = item.name;
            submit.textContent = "Salvar alterações";
            input.focus();
          };
          remove.onclick = () => {
            deleting = item.id;
            dialog.showModal();
          };
          li.append(text, edit, remove);
          return li;
        }),
      );
      status.textContent = items.length ? "" : "Nenhum item";
    };
    form.onsubmit = async (event) => {
      event.preventDefault();
      const item = await get(
        editing ? "/api/items/" + editing : "/api/items",
        editing ? "PUT" : "POST",
        { name: input.value },
      );
      if (editing)
        items = items.map((old) => (old.id === editing ? item : old));
      else items.push(item);
      editing = null;
      submit.textContent = "Adicionar item";
      input.value = "";
      render();
    };
    byText("Cancelar").onclick = () => dialog.close();
    byText("Excluir item").onclick = async () => {
      await get("/api/items/" + deleting, "DELETE");
      items = items.filter((item) => item.id !== deleting);
      dialog.close();
      render();
    };
    get("/api/items").then((data) => {
      items = data.items;
      render();
    });
    break;
  }
  case "task-06": {
    const list = document.querySelector("ul"),
      alert = document.querySelector('[role="alert"]');
    async function load() {
      status.textContent = "Carregando";
      alert.textContent = "";
      list.replaceChildren();
      try {
        const data = await get("/api/items");
        list.replaceChildren(
          ...data.items.map((item) => {
            const li = document.createElement("li");
            li.textContent = item.name;
            return li;
          }),
        );
        status.textContent = data.items.length ? "" : "Nenhum item";
      } catch {
        status.textContent = "";
        alert.textContent = "Não foi possível carregar";
      }
    }
    byText("Tentar novamente").onclick = load;
    byText("Atualizar").onclick = load;
    load();
    break;
  }
  case "task-07": {
    const dialog = document.querySelector("dialog");
    modal(
      byText("Editar observação"),
      dialog,
      document.querySelector("#subject"),
      byText("Fechar"),
    );
    break;
  }
  case "task-08": {
    const dialog = document.querySelector("dialog");
    modal(
      byText("Abrir detalhes"),
      dialog,
      byText("Fechar detalhes"),
      byText("Fechar detalhes"),
    );
    break;
  }
  case "task-09": {
    for (const [id, attribute, fallback] of [
      ["theme", "inTheme", "light"],
      ["density", "inDensity", "calm"],
    ]) {
      const select = document.querySelector("#" + id);
      select.classList.add("in-input");
      const saved = localStorage.getItem("synthetic-" + id) ?? fallback;
      select.value = saved;
      document.documentElement.dataset[attribute] = saved;
      select.onchange = () => {
        document.documentElement.dataset[attribute] = select.value;
        localStorage.setItem("synthetic-" + id, select.value);
      };
    }
    break;
  }
  case "task-10": {
    get("/api/content").then((data) => {
      document.querySelector('[data-testid="content-title"]').textContent =
        data.title;
      document.querySelector('[data-testid="content-body"]').textContent =
        data.body;
      document.documentElement.dir = data.direction;
    });
    break;
  }
}
