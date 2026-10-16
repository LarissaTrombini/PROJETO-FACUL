
document.addEventListener("DOMContentLoaded", function () {
  const $ = (id) => document.getElementById(id);

  // 1. CONFIGURAÇÃO DO SUPABASE
  const SUPABASE_URL = "https://jvoyojvhaklqgfnrgbeb.supabase.co";
  const SUPABASE_PUBLIC_KEY =
    "sb_publishable_zZxuXHUy-m8_dDimg0Rb-A_6TQz3AGl";

  if (!window.supabase) {
    alert("Supabase não carregado. Confira os scripts no index.html.");
    return;
  }

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY
  );

  // 2. ELEMENTOS DA PÁGINA
  const mapElement = $("map");
  const statusElemento = $("location-status");
  const coordinates = $("coordinates");
  const latitudeInput = $("latitude");
  const longitudeInput = $("longitude");
  const locationInput = $("location");
  const categorySelect = $("category");
  const descriptionInput = $("description");
  const photoInput = $("photo");
  const confirmButton = $("confirm-location");
  const myLocationButton = $("my-location");
  const form = $("report-form");
  const formMessage = $("form-message");

  // 3. LISTAR OCORRÊNCIAS NO SITE
  async function carregarOcorrencias() {
    const lista = $("lista-ocorrencias");
    const mensagem = $("lista-status");

    if (!lista || !mensagem) return;

    mensagem.textContent = "Carregando ocorrências...";
    lista.replaceChildren();

    const { data, error } = await supabaseClient
      .from("ocorrencias")
      .select("id, categoria, descricao, localizacao, status, criado_em")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao carregar ocorrências:", error);
      mensagem.textContent = "Não foi possível carregar as ocorrências.";
      return;
    }

    if (!data || data.length === 0) {
      mensagem.textContent = "Ainda não existem ocorrências cadastradas.";
      return;
    }

    mensagem.textContent = data.length + " ocorrência(s) registrada(s).";

    data.forEach(function (ocorrencia) {
      const card = document.createElement("article");
      card.className = "feature-card";

      const titulo = document.createElement("h3");
      titulo.textContent = ocorrencia.categoria || "Sem categoria";

      const descricao = document.createElement("p");
      descricao.textContent = ocorrencia.descricao || "Sem descrição.";

      const local = document.createElement("p");
      local.textContent =
        "Local: " + (ocorrencia.localizacao || "Não informado");

      const statusCard = document.createElement("p");
      statusCard.textContent =
        "Status: " + (ocorrencia.status || "Aberto");

      const dataRegistro = document.createElement("small");
      if (ocorrencia.criado_em) {
        dataRegistro.textContent =
          "Registrada em " +
          new Date(ocorrencia.criado_em).toLocaleString("pt-BR");
      }

      card.append(titulo, descricao, local, statusCard, dataRegistro);
      lista.appendChild(card);
    });
  }

  // 4. VERIFICAR MAPA E FORMULÁRIO
  if (!mapElement || typeof L === "undefined") {
    if (statusElemento) {
      statusElemento.textContent =
        "Não foi possível carregar o mapa. Verifique sua internet.";
    }
    carregarOcorrencias();
    return;
  }

  if (
    !form || !categorySelect || !descriptionInput || !photoInput ||
    !confirmButton || !myLocationButton || !formMessage ||
    !latitudeInput || !longitudeInput || !locationInput
  ) {
    console.error("Um ou mais elementos do formulário não foram encontrados.");
    carregarOcorrencias();
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');

  if (!submitButton) {
    console.error("Botão de envio não encontrado.");
    carregarOcorrencias();
    return;
  }

  // 5. INICIALIZAR MAPA
  const localPadrao = [-27.1004, -52.6152];
  const map = L.map("map").setView(localPadrao, 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  // 6. MARCADORES DAS OCORRÊNCIAS
  const camadaOcorrencias = L.layerGroup().addTo(map);

  async function carregarMarcadoresOcorrencias() {
    camadaOcorrencias.clearLayers();

    const { data, error } = await supabaseClient
      .from("ocorrencias")
      .select(
        "id, categoria, descricao, localizacao, latitude, longitude, status"
      );

    if (error) {
      console.error("Erro ao carregar marcadores:", error);
      return;
    }

    if (!data || data.length === 0) {
      console.log("Nenhuma ocorrência cadastrada no mapa.");
      return;
    }

    let totalMarcadores = 0;

    data.forEach(function (ocorrencia) {
      const lat = Number(ocorrencia.latitude);
      const lng = Number(ocorrencia.longitude);

      if (
        ocorrencia.latitude == null ||
        ocorrencia.longitude == null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 || lat > 90 ||
        lng < -180 || lng > 180
      ) {
        return;
      }

      const status = (ocorrencia.status || "Aberto")
        .trim()
        .toLowerCase();

      let cor = "#dc3545";

      if (status === "em andamento" || status === "em_andamento") {
        cor = "#ffc107";
      } else if (status === "resolvido" || status === "resolvida") {
        cor = "#198754";
      }

      const iconeOcorrencia = L.divIcon({
        className: "icone-marcador-ocorrencia",
        html: `
          <div style="position:relative;width:34px;height:42px;">
            <svg xmlns="http://www.w3.org/2000/svg"
              width="34" height="42" viewBox="0 0 24 32"
              style="filter:drop-shadow(0 2px 2px #555);">
              <path
                d="M12 31 C10 27 2 17 2 11 A10 10 0 1 1 22 11 C22 17 14 27 12 31 Z"
                fill="${cor}" stroke="#ffffff" stroke-width="1.5"/>
              <circle cx="12" cy="11" r="4" fill="#ffffff"/>
            </svg>
          </div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -38]
      });

      const marcadorOcorrencia = L.marker([lat, lng], {
        icon: iconeOcorrencia
      });

      const popup = document.createElement("div");

      const titulo = document.createElement("h3");
      titulo.textContent = ocorrencia.categoria || "Ocorrência";

      const descricao = document.createElement("p");
      descricao.textContent = ocorrencia.descricao || "Sem descrição.";

      const local = document.createElement("p");
      local.textContent =
        "Local: " + (ocorrencia.localizacao || "Não informado");

      const statusPopup = document.createElement("p");
      statusPopup.textContent =
        "Status: " + (ocorrencia.status || "Aberto");

      popup.append(titulo, descricao, local, statusPopup);
      marcadorOcorrencia.bindPopup(popup).addTo(camadaOcorrencias);

      totalMarcadores++;
    });

    console.log("Marcadores de ocorrências carregados:", totalMarcadores);
  }

  // Carregar dados uma vez
  carregarOcorrencias();
  carregarMarcadoresOcorrencias();

  // 7. VARIÁVEIS DO MAPA E CADASTRO
  let marcador = null;
  let marcadorUsuario = null;
  let pontoEscolhido = null;
  let localConfirmado = false;

  function atualizarStatus(mensagem) {
    if (statusElemento) statusElemento.textContent = mensagem;
  }

  function bloquearFormulario(bloquear) {
    categorySelect.disabled = bloquear;
    descriptionInput.disabled = bloquear;
    photoInput.disabled = bloquear;
    submitButton.disabled = bloquear;
  }

  bloquearFormulario(true);
  confirmButton.disabled = true;

  // 8. MARCAR LOCAL NO MAPA
  function mostrarPonto(lat, lng) {
    pontoEscolhido = { lat, lng };
    localConfirmado = false;

    bloquearFormulario(true);
    confirmButton.disabled = false;

    if (marcador) {
      marcador.setLatLng([lat, lng]);
    } else {
      marcador = L.marker([lat, lng]).addTo(map);
    }

    marcador.bindPopup("Ponto escolhido para a ocorrência").openPopup();

    coordinates.textContent =
      "Latitude: " + lat.toFixed(6) +
      " | Longitude: " + lng.toFixed(6);

    atualizarStatus(
      "Ponto marcado! Clique em Confirmar local se estiver correto."
    );
  }

  // 9. LOCALIZAÇÃO DO USUÁRIO
  function localizarUsuario() {
    if (!navigator.geolocation) {
      atualizarStatus(
        "GPS indisponível. Escolha o local manualmente no mapa."
      );
      return;
    }

    atualizarStatus("Buscando sua localização atual...");
    myLocationButton.disabled = true;

    navigator.geolocation.getCurrentPosition(
      function (posicao) {
        const lat = posicao.coords.latitude;
        const lng = posicao.coords.longitude;

        map.setView([lat, lng], 17);

        if (marcadorUsuario) {
          marcadorUsuario.setLatLng([lat, lng]);
        } else {
          marcadorUsuario = L.circleMarker([lat, lng], {
            radius: 9,
            color: "#ffffff",
            weight: 3,
            fillColor: "#176b87",
            fillOpacity: 1
          }).addTo(map);
        }

        marcadorUsuario.bindPopup("Sua localização aproximada.");

        atualizarStatus(
          "Localização encontrada! Clique no mapa para marcar o problema."
        );

        myLocationButton.disabled = false;
      },
      function (erro) {
        let mensagem = "Não foi possível acessar o GPS. ";

        if (erro.code === 1) {
          mensagem += "Permissão de localização negada.";
        } else if (erro.code === 2) {
          mensagem += "Posição indisponível.";
        } else if (erro.code === 3) {
          mensagem += "A localização demorou para responder.";
        }

        mensagem += " Selecione o local manualmente no mapa.";

        atualizarStatus(mensagem);
        myLocationButton.disabled = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  localizarUsuario();
  myLocationButton.addEventListener("click", localizarUsuario);

  map.on("click", function (evento) {
    mostrarPonto(evento.latlng.lat, evento.latlng.lng);
  });

  // 10. CONFIRMAR LOCAL
  confirmButton.addEventListener("click", function () {
    if (!pontoEscolhido) {
      atualizarStatus("Clique no mapa para escolher um local primeiro.");
      return;
    }

    const lat = pontoEscolhido.lat;
    const lng = pontoEscolhido.lng;

    localConfirmado = true;
    latitudeInput.value = lat.toFixed(6);
    longitudeInput.value = lng.toFixed(6);

    locationInput.value =
      "Latitude: " + lat.toFixed(6) +
      ", Longitude: " + lng.toFixed(6);

    bloquearFormulario(false);
    confirmButton.disabled = true;
    categorySelect.value = "";
    formMessage.textContent = "";

    atualizarStatus(
      "Local confirmado! Escolha a categoria e descreva o problema."
    );

    const registrar = $("registrar");
    if (registrar) {
      registrar.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    categorySelect.focus({ preventScroll: true });
  });

  // 11. CADASTRAR OCORRÊNCIA E ENVIAR FOTO
  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!localConfirmado || !pontoEscolhido) {
      formMessage.textContent =
        "Selecione e confirme um local no mapa antes de continuar.";

      const mapaSection = $("mapa-section");
      if (mapaSection) {
        mapaSection.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const arquivoFoto = photoInput.files?.[0] || null;

    // Validar formato e tamanho
    if (arquivoFoto) {
      const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
      ];

      if (!tiposPermitidos.includes(arquivoFoto.type)) {
        formMessage.textContent =
          "Formato não permitido. Use JPG, PNG, WEBP ou GIF.";
        return;
      }

      if (arquivoFoto.size > 5 * 1024 * 1024) {
        formMessage.textContent = "A foto deve ter no máximo 5 MB.";
        return;
      }
    }

    submitButton.disabled = true;
    formMessage.textContent = arquivoFoto
      ? "Enviando foto e salvando ocorrência..."
      : "Salvando ocorrência...";

    let caminhoFoto = null;
    let fotoEnviada = false;

    try {
      let fotoUrl = null;

      // 1. Enviar foto ao Storage
      if (arquivoFoto) {
        const extensoesPermitidas = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif"
        };

        const extensao = extensoesPermitidas[arquivoFoto.type];
        const nomeArquivo =
          `${Date.now()}-${crypto.randomUUID()}.${extensao}`;

        caminhoFoto = `ocorrencias/${nomeArquivo}`;

        const { error: erroUpload } = await supabaseClient
          .storage
          .from("imagens-avisos")
          .upload(caminhoFoto, arquivoFoto, {
            cacheControl: "3600",
            contentType: arquivoFoto.type,
            upsert: false
          });

        if (erroUpload) {
          throw new Error(
            "Falha no envio da foto: " + erroUpload.message
          );
        }

        fotoEnviada = true;

        const { data: dadosFoto } = supabaseClient
          .storage
          .from("imagens-avisos")
          .getPublicUrl(caminhoFoto);

        if (!dadosFoto?.publicUrl) {
          throw new Error(
            "A foto foi enviada, mas não foi possível obter o endereço público."
          );
        }

        fotoUrl = dadosFoto.publicUrl;
      }

      // 2. Salvar ocorrência com foto_url
      const ocorrencia = {
        categoria: categorySelect.value,
        localizacao: locationInput.value,
        latitude: Number(latitudeInput.value),
        longitude: Number(longitudeInput.value),
        descricao: descriptionInput.value.trim(),
        status: "Aberto",
        foto_url: fotoUrl
      };

      const { data, error } = await supabaseClient
        .from("ocorrencias")
        .insert([ocorrencia])
        .select("id")
        .single();

      if (error) {
        throw new Error(
          "Falha ao salvar a ocorrência: " + error.message
        );
      }

      formMessage.textContent =
        "Ocorrência registrada com sucesso!" +
        (arquivoFoto ? " Foto anexada." : "") +
        " Número do registro: " + data.id;

      form.reset();
      localConfirmado = false;
      pontoEscolhido = null;

      bloquearFormulario(true);
      confirmButton.disabled = true;

      if (marcador) {
        map.removeLayer(marcador);
        marcador = null;
      }

      if (coordinates) coordinates.textContent = "";

      atualizarStatus(
        "Registro concluído! Marque um novo local para registrar outra ocorrência."
      );

      await Promise.all([
        carregarOcorrencias(),
        carregarMarcadoresOcorrencias()
      ]);

    } catch (erro) {
      console.error("Erro ao registrar ocorrência:", erro);

      formMessage.textContent =
        erro?.message ||
        "Não foi possível registrar a ocorrência. Confira as permissões do Supabase.";

      // Remover foto órfã se o cadastro falhar depois do upload
      if (fotoEnviada && caminhoFoto) {
        const { error: erroRemocao } = await supabaseClient
          .storage
          .from("imagens-avisos")
          .remove([caminhoFoto]);

        if (erroRemocao) {
          console.error(
            "Não foi possível remover a foto não vinculada:",
            erroRemocao
          );
        }
      }

    } finally {
      submitButton.disabled = !localConfirmado;
    }
  });
});
